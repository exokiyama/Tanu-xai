import { config } from '../../Tanu/config.js';
export function startDailyReportScheduler() { return config.dailyReportEnabled ? setInterval(() => undefined, 86_400_000) : undefined; }
