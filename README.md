# PeerTube Plugin VP9 Opus

Adds a profile to render videos with -crf 40 libvpx-vp9 and -b:a 256k libopus audio. These are modern and more efficient alternatives to the Peertube default encoders (H264 and AAC). However, despite being able to be decoded by virtually all browsers used today, this format can not be read by Safari before Big Sur.

