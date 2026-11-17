<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

function booking_redirect(string $query): void
{
    header('Location: /book/?' . $query, true, 303);
    exit;
}

function booking_line(string $key, int $maxLength): string
{
    $value = $_POST[$key] ?? '';
    if (!is_string($value) || strlen($value) > $maxLength * 4) {
        return '';
    }
    $clean = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value);
    if ($clean === null) {
        return '';
    }
    $clean = trim(preg_replace('/\s+/u', ' ', $clean) ?? '');
    return strlen($clean) <= $maxLength ? $clean : '';
}

if (!empty($_POST['company_website'])) {
    booking_redirect('sent=1');
}

$name = booking_line('name', 120);
$contactNumber = booking_line('contact_number', 30);
$city = booking_line('show_city', 100);
$showDate = booking_line('show_date', 10);
$venue = booking_line('venue_name', 150);
$showCount = booking_line('number_of_shows', 2);
$notesInput = $_POST['additional_notes'] ?? '';
$notes = is_string($notesInput) && strlen($notesInput) <= 2000
    ? trim(str_replace(["\r", "\0"], ['', ''], $notesInput))
    : '';

$date = DateTimeImmutable::createFromFormat('!Y-m-d', $showDate);
$phoneDigits = preg_replace('/\D/', '', $contactNumber);
$valid = strlen($name) >= 2
    && strlen($city) >= 2
    && strlen($venue) >= 2
    && preg_match('/^[+0-9 ()-]{7,30}$/D', $contactNumber) === 1
    && strlen((string) $phoneDigits) >= 7
    && strlen((string) $phoneDigits) <= 15
    && $date !== false
    && $date->format('Y-m-d') === $showDate
    && preg_match('/^(?:[1-9]|[1-4][0-9]|50)$/D', $showCount) === 1
    && is_string($notesInput)
    && strlen($notesInput) <= 2000;
if (!$valid) {
    booking_redirect('error=invalid');
}

$rateFile = sys_get_temp_dir() . '/kratex-booking-' . hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$rateHandle = @fopen($rateFile, 'c+');
$rateLocked = $rateHandle !== false && flock($rateHandle, LOCK_EX);
if ($rateLocked) {
    $lastSent = (int) stream_get_contents($rateHandle);
    if ($lastSent > 0 && time() - $lastSent < 60) {
        flock($rateHandle, LOCK_UN);
        fclose($rateHandle);
        booking_redirect('error=wait');
    }
}

$subject = 'Kratex booking inq for ' . $city;
if (preg_match('/[^\x20-\x7E]/', $subject) === 1) {
    $subject = function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n")
        : '=?UTF-8?B?' . base64_encode($subject) . '?=';
}
$body = "New Kratex booking inquiry\n\n"
    . "Name: {$name}\n"
    . "Contact number: {$contactNumber}\n"
    . "Show city: {$city}\n"
    . "Show date: {$showDate}\n"
    . "Venue / club: {$venue}\n"
    . "Number of shows: {$showCount}\n"
    . "Additional notes: " . ($notes === '' ? 'None' : "\n{$notes}") . "\n";
$headers = [
    'From' => 'Kratex Bookings <contact@kratex.in>',
    'Cc' => 'chintan@worldofvibes.com, contact@kratex.com',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
];
$sent = @mail('rock@worldofvibes.com', $subject, $body, $headers, '-fcontact@kratex.in');
if ($rateHandle !== false) {
    if ($sent && $rateLocked) {
        rewind($rateHandle);
        ftruncate($rateHandle, 0);
        fwrite($rateHandle, (string) time());
        fflush($rateHandle);
    }
    if ($rateLocked) {
        flock($rateHandle, LOCK_UN);
    }
    fclose($rateHandle);
}
if (!$sent) {
    error_log('Kratex booking email could not be sent.');
    booking_redirect('error=delivery');
}
booking_redirect('sent=1');
