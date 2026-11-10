<?php
// Shared by the standalone examples. Keep account credentials on the PHP host.
function demo_json(array $value, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function demo_state_dir(): string {
    $dir = getenv('VWH5_STORAGE_DIR') ?: sys_get_temp_dir() . '/vwh5-' . hash('sha256', __DIR__);
    if (is_link($dir) || (!is_dir($dir) && !mkdir($dir, 0700, true))) {
        throw new RuntimeException('Private demo storage is unavailable.');
    }
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? __DIR__);
    $real = realpath($dir);
    if (!$real || ($root && ($real === $root || str_starts_with($real, $root . DIRECTORY_SEPARATOR)))) {
        throw new RuntimeException('Demo storage must be outside the web root.');
    }
    return $real;
}
function demo_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('vwh5_' . substr(hash('sha256', __DIR__), 0, 12));
    session_start(['use_strict_mode'=>1, 'cookie_httponly'=>1,
        'cookie_secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'cookie_samesite'=>'Lax', 'cookie_path'=>'/']);
    header('Cache-Control: no-store');
    header('Referrer-Policy: same-origin');
    $_SESSION['rooms'] ??= [];
    foreach ($_SESSION['rooms'] as $id => $entry) {
        if (($entry['expires'] ?? 0) < time()) unset($_SESSION['rooms'][$id]);
    }
}
function demo_page_session(string $kind): array {
    demo_session();
    $room = filter_input(INPUT_GET, 'r', FILTER_VALIDATE_INT) ?: 0;
    if ($room && ($room < 9000 || $room > 9999)) demo_json(['error'=>'Invalid room.'], 400);
    $owner = !$room;
    if (!$room) $room = random_int(9000, 9999);
    if (!isset($_SESSION['rooms'][$room])) {
        if (count($_SESSION['rooms']) >= 20) demo_json(['error'=>'Too many active demo rooms.'], 429);
        $uid = $owner ? 10000 + $room : ($kind === 'call' ? $room : random_int(9000, 9999));
        $_SESSION['rooms'][$room] = ['user'=>$uid, 'session'=>random_int(100000, 2147483646),
            'key'=>bin2hex(random_bytes(32)), 'owner'=>$owner, 'expires'=>time()+3600];
    }
    $s = $_SESSION['rooms'][$room];
    session_write_close();
    return [$room, $s['user'], $s['session'], $s['key'], (int)$s['owner']];
}
function demo_validate_request(array $input): array {
    demo_session();
    $room = (int)($input['roomID'] ?? 0);
    $s = $_SESSION['rooms'][$room] ?? null;
    if (!$s || (int)($input['userID'] ?? 0) !== $s['user'] ||
        (int)($input['sessionID'] ?? 0) !== $s['session'] ||
        !is_string($input['sessionKey'] ?? null) || !hash_equals($s['key'], $input['sessionKey']) ||
        !empty($input['privateUID']) || !empty($input['roomActionID'])) {
        demo_json(['error'=>'Invalid or expired session. Reload the page.'], 403);
    }
    session_write_close();
    return $s;
}
function demo_pin(string $user, array $options): array {
    if (empty($options['vwsAccount']) || strlen($options['vwsToken'] ?? '') < 24) {
        demo_json(['error'=>'Configure an account and private token on the PHP host.'], 503);
    }
    $body = rtrim(strtr(base64_encode(json_encode(['user'=>$user, 'account'=>$options['vwsAccount'],
        'expires'=>time()+300])), '+/', '-_'), '=');
    return ['account'=>$options['vwsAccount'], 'pin'=>$body . '.' . hash_hmac('sha256', $body, $options['vwsToken'])];
}
function demo_pin_valid(array $input, array $options): bool {
    if (!is_string($input['token'] ?? null) || empty($options['vwsToken']) ||
        !hash_equals($options['vwsToken'], $input['token']) ||
        ($input['account'] ?? '') !== ($options['vwsAccount'] ?? '') ||
        !is_string($input['pin'] ?? null) || strlen($input['pin']) > 512) return false;
    $parts = explode('.', $input['pin']);
    if (count($parts) !== 2 || !hash_equals(hash_hmac('sha256', $parts[0], $options['vwsToken']), $parts[1])) return false;
    $data = json_decode(base64_decode(strtr($parts[0], '-_', '+/'), true) ?: '', true);
    return is_array($data) && ($data['account'] ?? '') === $input['account'] &&
        is_int($data['expires'] ?? null) && $data['expires'] >= time() && $data['expires'] <= time()+300 &&
        is_string($data['user'] ?? null) && in_array($input['user'] ?? null, [$data['user'], $data['user'].'_play'], true);
}
function demo_room_url(int $room, string $page = ''): string {
    // Relative URLs avoid trusting Host/forwarded headers and work in subfolders.
    return './' . $page . '?r=' . $room;
}
function demo_upload(string $room): array {
    $files = $_FILES;
    if (count($files) !== 1) demo_json(['error'=>'Send one recording at a time.'], 400);
    $file = reset($files);
    if (!is_array($file) || !is_string($file['name'] ?? null) ||
        ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK ||
        ($file['size'] ?? 0) < 1 || $file['size'] > 25*1024*1024 || !is_uploaded_file($file['tmp_name'] ?? '')) {
        demo_json(['error'=>'Recording must be a valid upload of at most 25 MB.'], 400);
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $types = ['webm'=>['video/webm','audio/webm'], 'mp4'=>['video/mp4','audio/mp4'],
        'ogg'=>['audio/ogg','video/ogg','application/ogg'], 'opus'=>['audio/ogg','audio/opus'], 'mp3'=>['audio/mpeg']];
    $type = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset($types[$ext]) || !in_array($type, $types[$ext], true)) demo_json(['error'=>'Unsupported recording format.'], 415);
    $quotaLock = fopen(demo_state_dir() . '/recording-upload.lock', 'c');
    if (!$quotaLock || !flock($quotaLock, LOCK_EX)) demo_json(['error'=>'Recording storage unavailable.'], 503);
    $total = 0;
    foreach (glob(__DIR__.'/uploads/Room[0-9]*/*') ?: [] as $entry) {
        if (is_file($entry) && !is_link($entry)) $total += filesize($entry);
        if ($total + $file['size'] > 500*1024*1024) demo_json(['error'=>'Demo storage quota reached.'], 429);
    }
    $dir = __DIR__ . '/uploads/' . $room;
    if (is_link(__DIR__.'/uploads') || is_link($dir) || (!is_dir($dir) && !mkdir($dir, 0755, true))) demo_json(['error'=>'Recording storage unavailable.'], 503);
    $recordings = glob($dir . '/*') ?: [];
    $bytes = 0;
    foreach ($recordings as $entry) if (is_file($entry) && !is_link($entry)) $bytes += filesize($entry);
    if (count($recordings) >= 20 || $bytes + $file['size'] > 100*1024*1024) demo_json(['error'=>'Recording booth quota reached.'], 429);
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) demo_json(['error'=>'Recording upload failed.'], 503);
    // This example deliberately serves accepted recordings publicly. Private
    // customer media needs an authenticated download adapter instead.
    chmod($dir . '/' . $name, 0644);
    return ['uploadCount'=>1, 'uploadRecLast'=>'uploads/'.$room.'/'.$name,
        'uploadRecLastF'=>$name, 'uploadRecLastExt'=>$ext];
}
