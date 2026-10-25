import { ok } from '../utils/http.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import { getEmployeeDashboard, getOverview } from '../services/dashboardService.mjs';
import { nowParts } from '../utils/dates.mjs';

export async function overview(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : `${todayKey.slice(0, 7)}-01`;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : todayKey;
  const department = req.query.department || '';

  const data = await getOverview({ org, from, to, department, includePayroll: true });
  ok(res, data);
}

export async function employeeDashboard(req, res) {
  if (!req.employee) {
    return ok(res, {
      employeeMissing: true,
      message: 'Your account has no employee profile. Ask HR to link it.'
    });
  }
  const org = await getOrganization();
  const data = await getEmployeeDashboard({ org, user: req.user, employee: req.employee });
  ok(res, data);
}
