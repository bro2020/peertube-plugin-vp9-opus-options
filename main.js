// Global context to hold instances we need across different functions.
const pluginContext = {
  transcodingManager: null,
  logger: null
};

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
// It's called on startup and every time settings are changed.
function updateTranscodingProfiles(settings) {
  const { transcodingManager, logger } = pluginContext;

  // First, clear any old profiles created by this plugin.
  transcodingManager.removeAllProfilesAndEncoderPriorities();

  // Get all values from the settings object.
  const videoCodec = settings['video-codec-name'];
  const videoInputOptionsStr = settings['video-input-options'];
  const videoOutputOptionsStr = settings['video-output-options'];

  const audioCodec = settings['audio-codec-name'];
  const audioInputOptionsStr = settings['audio-input-options'];
  const audioOutputOptionsStr = settings['audio-output-options'];

  const profileName = settings['profile-name'];
  const priority = parseInt(settings['encoder-priority'], 10) || 1000;
  
  // Don't register if codecs are not defined
  if (!videoCodec || !audioCodec) {
    logger.warn('Video or audio codec is not defined in the settings. Skipping profile registration.');
    return;
  }

  logger.info(`Updating profile '${profileName}' with video encoder '${videoCodec}' and audio encoder '${audioCodec}'.`);

  // Add the transcoding profiles using the fully customized values.
  transcodingManager.addVODProfile(videoCodec, profileName, () => ({
    inputOptions: parseOptionsString(videoInputOptionsStr),
    outputOptions: parseOptionsString(videoOutputOptionsStr)
  }));

  transcodingManager.addVODProfile(audioCodec, profileName, () => ({
    inputOptions: parseOptionsString(audioInputOptionsStr),
    outputOptions: parseOptionsString(audioOutputOptionsStr)
  }));

  // Set the priority for the encoders.
  transcodingManager.addVODEncoderPriority('video', videoCodec, priority);
  transcodingManager.addVODEncoderPriority('audio', audioCodec, priority);
}


// --- Plugin Registration Logic ---

async function register({ registerSetting, peertubeHelpers, transcodingManager, settingsManager }) {
  // Store instances in our global context for other functions to use.
  pluginContext.transcodingManager = transcodingManager;
  pluginContext.logger = peertubeHelpers.logger;

  pluginContext.logger.info('Registering Universal Transcoding Plugin with live reload support.');

  // --- 1. Register all settings as text fields ---
  registerSetting({
    name: 'video-codec-name',
    label: 'Video Codec Name',
    type: 'input',
    default: 'libvpx-vp9',
    descriptionHTML: 'The name of the video encoder (e.g., <code>libvpx-vp9</code>, <code>libx264</code>).',
  });
  
  registerSetting({
    name: 'video-input-options',
    label: 'Video Input Options (optional)',
    type: 'input',
    default: '',
    descriptionHTML: 'FFmpeg input options applied before the input file (e.g., <code>-thread_queue_size 512</code>).',
  });

  registerSetting({
    name: 'video-output-options',
    label: 'Video Output Options',
    type: 'textarea',
    default: '-crf 32 -b:v 5M -deadline good -tile-columns 2 -frame-parallel 1 -row-mt 1',
    descriptionHTML: 'FFmpeg output options for the video stream.',
  });

  registerSetting({
    name: 'audio-codec-name',
    label: 'Audio Codec Name',
    type: 'input',
    default: 'libopus',
    descriptionHTML: 'The name of the audio encoder (e.g., <code>libopus</code>, <code>aac</code>).',
  });

  registerSetting({
    name: 'audio-input-options',
    label: 'Audio Input Options (optional)',
    type: 'input',
    default: '',
    descriptionHTML: 'FFmpeg input options for audio (rarely needed).',
  });

  registerSetting({
    name: 'audio-output-options',
    label: 'Audio Output Options',
    type: 'textarea',
    default: '-b:a 192k',
    descriptionHTML: 'FFmpeg output options for the audio stream.',
  });

  registerSetting({
    name: 'profile-name',
    label: 'Internal Profile Name',
    type: 'input',
    default: 'optional-vp9',
    descriptionHTML: 'A unique internal name to link the video and audio parts.',
  });

  registerSetting({
    name: 'encoder-priority',
    label: 'Encoder Priority',
    type: 'input',
    inputType: 'number',
    default: '1000',
    descriptionHTML: 'A number that tells PeerTube how much to prefer these encoders. Higher is better.',
  });

  // --- 2. Set up the live reload listener ---
  settingsManager.onSettingsChange(settings => {
    pluginContext.logger.info('Plugin settings changed. Reloading transcoding profiles...');
    updateTranscodingProfiles(settings);
  });

  // --- 3. Initial profile creation on startup ---
  const initialSettings = await settingsManager.getSettings();
  updateTranscodingProfiles(initialSettings);
}

async function unregister() {
  // Use the stored instance to remove all profiles and priorities created by this plugin.
  if (pluginContext.transcodingManager) {
    pluginContext.transcodingManager.removeAllProfilesAndEncoderPriorities();
  }
}

module.exports = {
  register,
  unregister
};
