'use strict';
const song = require('./song');
module.exports = { ...song, pattern: 'yt', aliases: ['ytvideo'], description: 'Download YouTube audio/video', usage: 'yt <YouTube URL or search query> [audio|video]' };
