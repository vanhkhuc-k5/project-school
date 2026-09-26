// =============================================================================
// Leadership Controller — HTTP Handlers
// G32 — Principal / Vice Principal Dashboard
// =============================================================================
import { leadershipService } from './leadership.service.js';
import { getAlertSeverityColor, getAlertSeverityLabel } from './leadership.types.js';

/**
 * GET /api/leadership/dashboard
 * Get comprehensive leadership dashboard
 */
export async function getLeadershipDashboard(req, res, next) {
  try {
    const schoolId = req.user?.schoolId || req.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'Không xác định được trường học',
      });
    }

    const { academicYearId, semesterId, period } = req.query;

    const dashboard = await leadershipService.getLeadershipDashboard({
      schoolId,
      academicYearId: academicYearId || null,
      semesterId: semesterId || null,
      period: period || 'this_month',
    });

    // Enhance alerts with display properties
    const enhancedAlerts = dashboard.alerts.map(alert => ({
      ...alert,
      color: getAlertSeverityColor(alert.severity),
      label: getAlertSeverityLabel(alert.severity),
    }));

    res.json({
      success: true,
      data: {
        ...dashboard,
        alerts: enhancedAlerts,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leadership/class/:classId
 * Get detailed class view (requires authorization)
 */
export async function getClassDetail(req, res, next) {
  try {
    const schoolId = req.user?.schoolId || req.schoolId;
    const { classId } = req.params;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: 'Không xác định được trường học',
      });
    }

    const classDetail = await leadershipService.getClassDetail({
      schoolId,
      classId,
    });

    res.json({
      success: true,
      data: classDetail,
    });
  } catch (err) {
    next(err);
  }
}
