// A global variable to hold the transcoding manager instance, so we can access it during unregistration.
let transcodingManagerInstance = null;

// --- Static Definitions for Settings ---

// Generate the list of possible values for the settings dropdowns.
const CRF_OPTIONS = Array.from({ length: 64 }, (_, i) => i.toString()); // '0' to '63'

const AUDIO_BITRATE_OPTIONS = [];
for (let i = 32; i <= 256; i += 16) {
  AUDIO_BITRATE_OPTIONS.push(i.toString());
}

// Add static options for the VP9 deadline parameter.
const DEADLINE_OPTIONS = ['realtime', 'good', 'best'];


// --- Plugin Registration Logic ---

async function register({ registerSetting, peertubeHelpers, transcodingManager, settingsManager }) {
  // Store the transcodingManager instance for later use in unregister()
  transcodingManagerInstance = transcodingManager;

  const logger = peertubeHelpers.logger;
  logger.info('Registering VP9/Opus plugin with v7 transcoding API.');

  // --- 1. Register the settings in the plugin's admin page ---
  registerSetting({
    name: 'crf',
    label: 'Video Quality (VP9 CRF)',
    type: 'select',
    options: CRF_OPTIONS.map(v => ({ label: `CRF ${v}`, value: v })),
    default: '32',
    descriptionHTML: 'Choose the CRF value (0–63). Lower numbers mean higher quality and larger file sizes.',
    private: false
  });

  // NEW: Add a setting for the Deadline parameter
  registerSetting({
    name: 'deadline',
    label: 'Encoding Speed vs. Quality (VP9 Deadline)',
    type: 'select',
    // Capitalize the first letter for a nicer display label
    options: DEADLINE_OPTIONS.map(v => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v })),
    default: 'good',
    descriptionHTML: 'Controls the encoding speed. "Realtime" is fastest. "Good" is the default balance. "Best" is slowest but offers the highest compression efficiency.',
    private: false
  });

  registerSetting({
    name: 'audio-bitrate',
    label: 'Audio Quality (Opus Bitrate)',
    type: 'select',
    options: AUDIO_BITRATE_OPTIONS.map(v => ({ label: `${v} kbps`, value: v })),
    default: '128',
    descriptionHTML: 'Choose the audio bitrate in kbps for Opus encoding.',
    private: false
  });

  // --- 2. Read all chosen values from the settings ---
  const chosenCRF = await settingsManager.getSetting('crf');
  const chosenDeadline = await settingsManager.getSetting('deadline');
  const chosenBitrate = await settingsManager.getSetting('audio-bitrate');
  
  logger.info(`Creating VP9/Opus profile with CRF ${chosenCRF}, Deadline ${chosenDeadline}, and Audio Bitrate ${chosenBitrate}k.`);

  // --- 3. Add the transcoding profiles using the chosen values ---
  
  // Define the video part of the profile
  transcodingManager.addVODProfile('libvpx-vp9', 'vp9-opus-options', () => ({
    inputOptions: [],
    // We now use the 'chosenDeadline' variable here.
    outputOptions: [
      '-crf', chosenCRF, 
      '-deadline', chosenDeadline, 
      '-tile-columns', '2',
      '-frame-parallel', '1',
      '-row-mt', '1'
    ]
  }));

  // Define the audio part of the profile, linked by the 'vp9-opus-options' name
  transcodingManager.addVODProfile('libopus', 'vp9-opus-options', () => ({
    inputOptions: [],
    outputOptions: ['-b:a', `${chosenBitrate}k`]
  }));

  // --- 4. Set the priority for the encoders ---
  transcodingManager.addVODEncoderPriority('video', 'libvpx-vp9', 1000);
  transcodingManager.addVODEncoderPriority('audio', 'libopus', 1000);
}

async function unregister() {
  // Use the stored instance to remove all profiles and priorities created by this plugin.
  if (transcodingManagerInstance) {
    transcodingManagerInstance.removeAllProfilesAndEncoderPriorities();
  }
}

module.exports = {
  register,
  unregister
};
