async function register ({
  transcodingManager
}) {
  transcodingManager.addVODProfile('libvpx-vp9', 'vp9-opus', () => ({
    inputOptions: [],
    outputOptions: ['-crf', '40', '-row-mt', '1']
  }));

  transcodingManager.addVODProfile('libopus', 'vp9-opus', () => ({
    inputOptions: [],
    outputOptions: ['-b:a', '256k']
  }));

  transcodingManager.addVODEncoderPriority('video', 'libvpx-vp9', 1000);
  transcodingManager.addVODEncoderPriority('audio', 'libopus', 1000);


}

async function unregister () {
  transcodingManager.removeAllProfilesAndEncoderPriorities();
}

module.exports = {
  register,
  unregister
};
