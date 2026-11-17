<?php

// Generates the fixtures with the code udb3-backend uses to publish job messages:
// its SocketIOEmitterHandler and the rase/socket.io-emitter library.
// For every case it writes the payload published on Redis (<name>.bin) and the
// event and data the handler emitted (<name>.json).
//
// Run it with: npm run test:fixtures

require '/udb3-backend/vendor/autoload.php';

use CultuurNet\UDB3\Log\SocketIOEmitterHandler;
use Monolog\Logger;
use SocketIO\Emitter;

class CapturingRedis
{
    public string $payload = '';

    public function publish($channel, $payload): void
    {
        $this->payload = $payload;
    }
}

class CapturingHandler extends SocketIOEmitterHandler
{
    public array $emitted = [];

    protected function write(array $record): void
    {
        $this->emitted = [
            'event' => $record['formatted']['message'],
            'data' => $record['formatted']['context'],
        ];
        parent::write($record);
    }
}

$cases = [
    'job-started' => [Logger::INFO, 'job_started', ['job_id' => '6f1f3c3e-2b1a-4c1e-9d3a-0a1b2c3d4e5f']],
    'job-finished' => [Logger::INFO, 'job_finished', ['job_id' => '6f1f3c3e-2b1a-4c1e-9d3a-0a1b2c3d4e5f']],
    'job-info-export' => [Logger::INFO, 'job_info', [
        'job_id' => '6f1f3c3e-2b1a-4c1e-9d3a-0a1b2c3d4e5f',
        'location' => 'https://io.uitdatabank.be/downloads/6f1f3c3e.json',
    ]],
    'job-info-media' => [Logger::INFO, 'job_info', [
        'job_id' => '6f1f3c3e-2b1a-4c1e-9d3a-0a1b2c3d4e5f',
        'file_id' => 'a8b2c4d6-1e3f-4a5b-8c7d-9e0f1a2b3c4d',
    ]],
    'job-failed' => [Logger::ERROR, 'job_failed', [
        'job_id' => '6f1f3c3e-2b1a-4c1e-9d3a-0a1b2c3d4e5f',
        'exception' => new RuntimeException('Export failed', 42, new LogicException('Previous')),
    ]],
    'no-context' => [Logger::INFO, 'job_finished', []],
    'unicode' => [Logger::INFO, 'job_info', ['name' => 'Café Düsseldorf — 🎭 ½']],
    'large-integers' => [Logger::INFO, 'job_info', [
        'uint64' => 4294967296,
        'int64' => -2147483649,
        'timestamp_ms' => 1763300000000,
    ]],
    'types' => [Logger::INFO, 'job_info', [
        'null' => null,
        'true' => true,
        'false' => false,
        'zero' => 0,
        'negative_fixint' => -32,
        'uint8' => 255,
        'uint16' => 65535,
        'uint32' => 4294967295,
        'int8' => -128,
        'int16' => -32768,
        'int32' => -2147483648,
        'float' => 1.5,
        'empty_array' => [],
        'list' => [1, 'two', 3.5],
        'nested' => ['level1' => ['level2' => ['level3' => 'deep']]],
        'string_31_bytes' => str_repeat('a', 31),
        'string_32_bytes' => str_repeat('b', 32),
    ]],
    'map-16-keys' => [Logger::INFO, 'job_info', array_combine(
        array_map(fn ($i) => 'key' . $i, range(1, 16)),
        range(1, 16)
    )],
    'large-string' => [Logger::INFO, 'job_info', ['content' => str_repeat('x', 70000)]],
];

foreach ($cases as $name => [$level, $event, $context]) {
    $redis = new CapturingRedis();
    $handler = new CapturingHandler(new Emitter($redis), Logger::INFO);
    $logger = new Logger('resque', [$handler]);

    $logger->log($level, $event, $context);

    file_put_contents(__DIR__ . '/' . $name . '.bin', $redis->payload);
    file_put_contents(
        __DIR__ . '/' . $name . '.json',
        json_encode($handler->emitted, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION) . "\n"
    );
}
