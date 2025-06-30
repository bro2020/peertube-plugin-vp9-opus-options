# PeerTube Plugin VP9 Opus

Adds a video rendering profile with the ability to parameterize -crf and -deadline for the libvpx-vp9 codec and -b:a for the libopus audio codec. These are modern and more efficient alternatives to the Peertube default encoders (H264 and AAC). However, despite being able to be decoded by virtually all browsers used today, this format can not be read by Safari before Big Sur.

