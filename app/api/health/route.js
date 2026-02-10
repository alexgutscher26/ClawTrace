import { json, OPTIONS } from '@/lib/api-utils';

export { OPTIONS };

export async function GET() {
  return json({ status: 'ok', timestamp: new Date().toISOString() });
}
