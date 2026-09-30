// Must run before `ws` is loaded. The optional `bufferutil` addon is skipped so
// Next cannot substitute a stub whose `mask` is not a function.
process.env.WS_NO_BUFFER_UTIL = "1";
