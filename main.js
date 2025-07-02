// Global context to hold instances we need across different functions.
const pluginContext = {
  transcodingManager: null,
  logger: null
};

// An array of all setting names used by this plugin.
const ALL_SETTING_NAMES = [
  'video-codec-name',
  'video-input-options',
  'video-output-options',
  'audio-codec-name',
  'audio-input-options',
  'audio-output-options',
  'profile-name',
  'encoder-priority'
];

// Helper function to safely parse a string of options into an array for FFmpeg.
function parseOptionsString(optionsStr) {
  if (!optionsStr || typeof optionsStr !== 'string') return [];
  // This regex splits by spaces but keeps quoted strings together.
  return optionsStr.match(/\\?.|^$/g).reduce((p, c) => {
    if (c === '"') {
      p.quote = !p.quote;
    } else if (!p.quote && c === ' ') {
      p.a.push('');
    } else {
      p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
    }
    return p;
  }, { a: [''] }).a;
}

// This function contains the core logic to build the transcoding profile.
function updateTranscodingProfiles(settings) {
  const { transcodingManager, logger } = pluginContext;

  // First, clear any old profiles created by this plugin.
  transcodingManager.removeAllProfilesAndEncoderPriorities();

  const videoCodec = settings['video-codec-name'];
  const audioCodec = settings['audio-codec-name'];
  const profileName = settings['profile-name'];
  
  if (!videoCodec || !audioCodec || !profileName) {
    logger.warn('Core settings (codec or profile name) are not defined. Skipping profile registration.');
    return;
  }

  const videoInputOptionsStr = settings['video-input-options'];
  const videoOutputOptionsStr = settings['video-output-options'];
  const audioInputOptionsStr = settings['audio-input-options'];
  const audioOutputOptionsStr = settings['audio-output-options'];
  const priority = parseInt(settings['encoder-priority'], 10) || 1000;

  logger.info(`Updating profile '${profileName}' with video encoder '${videoCodec}' and audio encoder '${audioCodec}'.`);

  transcodingManager.addVODProfile(videoCodec, profileName, () => ({
    inputOptions: parseOptionsString(videoInputOptionsStr),
    outputOptions: parseOptionsString(videoOutputOptionsStr)
  }));

  transcodingManager.addVODProfile(audioCodec, profileName, () => ({
    inputOptions: parseOptionsString(audioInputOptionsStr),
    outputOptions: parseOptionsString(audioOutputOptionsStr)
  }));

  transcodingManager.addVODEncoderPriority('video', videoCodec, priority);
  transcodingManager.addVODEncoderPriority('audio', audioCodec, priority);
}

// --- Plugin Registration Logic ---

async function register({ registerSetting, peertubeHelpers, transcodingManager, settingsManager }) {
  pluginContext.transcodingManager = transcodingManager;
  pluginContext.logger = peertubeHelpers.logger;
  pluginContext.logger.info('Registering Universal Transcoding Plugin with live reload support.');

  // --- 1. Register all settings ---
  registerSetting({
    name: 'video-codec-name',
    label: 'Video Codec Name',
    type: 'input',
    default: 'libvpx-vp9',
    descriptionHTML: 'e.g., <code>libvpx-vp9</code>, <code>libx264</code>'
  });
  
  registerSetting({
    name: 'video-input-options',
    label: 'Video Input Options',
    type: 'input',
    default: '',
    descriptionHTML: 'e.g., <code>-thread_queue_size 512</code>'
  });
  
  registerSetting({
    name: 'video-output-options',
    label: 'Video Output Options',
    type: 'input',
    default: '-crf 32 -b:v 5M -tile-columns 2 -frame-parallel 1 -row-mt 1',
    descriptionHTML: 'e.g., <code>-crf 32 -b:v 5M -tile-columns 2 -frame-parallel 1 -row-mt 1</code>'
  });
  
  registerSetting({
    name: 'audio-codec-name',
    label: 'Audio Codec Name',
    type: 'input',
    default: 'libopus',
    descriptionHTML: 'e.g., <code>libopus</code>, <code>aac</code>'
  });
  
  registerSetting({
    name: 'audio-input-options',
    label: 'Audio Input Options',
    type: 'input',
    default: ''
  });
  
  registerSetting({
    name:'audio-output-options',
    label: 'Audio Output Options',
    type: 'input',
    default: '-b:a 192k',
    descriptionHTML: 'e.g., <code>-b:a 192k</code>'
  });
  
  registerSetting({
    name: 'profile-name',
    label: 'Internal Profile Name',
    type: 'input',
    default: 'customizable-vp9'
  });
  
  registerSetting({
    name: 'encoder-priority',
    label: 'Encoder Priority',
    type: 'input',
    inputType: 'number',
    default: '1000'
  });

  // --- 2. Set up the live reload listener ---
  settingsManager.onSettingsChange(settings => {
    pluginContext.logger.info('Plugin settings changed. Reloading transcoding profiles...');
    updateTranscodingProfiles(settings);
  });

  // --- 3. Initial profile creation on startup ---
  // We must explicitly provide the list of settings we want to get.
  const initialSettings = await settingsManager.getSettings(ALL_SETTING_NAMES);
  updateTranscodingProfiles(initialSettings);
}

async function unregister() {
  if (pluginContext.transcodingManager) {
    pluginContext.transcodingManager.removeAllProfilesAndEncoderPriorities();
  }
}

module.exports = {
  register,
  unregister
};
