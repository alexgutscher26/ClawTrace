const url = 'https://endhhptyjolxidjlhpay.supabase.co/auth/v1/health';
console.log(`Fetching ${url} with Bun...`);
const start = performance.now();
try {
    const res = await fetch(url);
    const end = performance.now();
    console.log(`Status: ${res.status}`);
    console.log(`Time: ${(end - start).toFixed(2)}ms`);
} catch (e) {
    console.error(`Fetch error:`, e);
}
