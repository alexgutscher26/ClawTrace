const url = 'https://endhhptyjolxidjlhpay.supabase.co/rest/v1/profiles?select=*&limit=1';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing DIRECT connection to Supabase REST API (No Proxy)...');
const start = performance.now();

try {
    const res = await fetch(url, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    const end = performance.now();
    const text = await res.text();

    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Duration: ${(end - start).toFixed(2)}ms`);
    console.log(`Body Snippet: ${text.slice(0, 100)}`);
} catch (e) {
    console.error('Fetch Error:', e.message);
}
