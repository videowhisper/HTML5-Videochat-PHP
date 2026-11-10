<?php
// Operator-only cleanup for media created by the current uploader. Older media
// and arbitrary files are preserved; never recurse through symlinks.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$options = getopt('', ['days:']);
$days = max(1, min(30, (int)($options['days'] ?? 1)));
$cutoff = time() - $days*86400;
$deleted = 0;
foreach (glob(__DIR__.'/uploads/Room[0-9]*/*') ?: [] as $file) {
    if ($deleted >= 1000) break;
    if (is_link(dirname($file)) || is_link($file) || !is_file($file)) continue;
    if (!preg_match('/^[a-f0-9]{32}\.(webm|mp4|ogg|opus|mp3)$/D', basename($file))) continue;
    if (filemtime($file) < $cutoff && unlink($file)) $deleted++;
}
echo 'Expired demo recordings removed: '.$deleted.PHP_EOL;
