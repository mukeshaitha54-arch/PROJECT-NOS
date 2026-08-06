import autocannon from 'autocannon';

/**
 * NOS Enterprise Platform — Phase 7 Autocannon Performance Benchmark
 * Simulates 100 concurrent agent connections over 10 seconds.
 */
function runPerformanceBenchmark(): Promise<autocannon.Result> {
  const targetUrl = process.env.API_URL || 'http://localhost:4000/api/v1';

  console.log('🚀 Initiating NOS Phase 7 Autocannon Load Benchmark Engine...');
  console.log(`Targeting Control Plane: ${targetUrl}`);
  console.log('Simulating 100 concurrent agent connections over 10 seconds...\n');

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${targetUrl}/health`,
        connections: 100,
        duration: 10,
        pipelining: 1,
        headers: {
          'content-type': 'application/json',
          'user-agent': 'NOS-Autocannon-LoadEngine/7.0',
        },
      },
      (err, result) => {
        if (err) return reject(err);

        console.log('\n📊 ─── NOS PERFORMANCE BENCHMARK RESULTS ───');
        console.log(`Total Requests:         ${result.requests.total}`);
        console.log(`Throughput (req/sec):   ${result.requests.average}`);
        console.log(`Latency (p50):          ${result.latency.p50} ms`);
        console.log(`Latency (p99):          ${result.latency.p99} ms`);
        console.log(`Throughput (bytes/sec): ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
        console.log(`Errors / Non-2xx:       ${result.errors + result.non2xx}`);
        console.log('──────────────────────────────────────────────\n');

        if (result.latency.p99 > 200) {
          console.warn('⚠️ Warning: p99 latency exceeded target threshold of 200ms.');
        } else {
          console.log('✅ Performance verification PASSED: p99 latency < 200ms target satisfied.');
        }

        resolve(result);
      },
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

if (require.main === module) {
  runPerformanceBenchmark().catch(console.error);
}

export { runPerformanceBenchmark };
