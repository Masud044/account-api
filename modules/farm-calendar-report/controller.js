import { getFarmCalendarReport } from './service.js';

export const getFarmCalendarReportController = async (req, res) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({ success: false, message: 'calendarId is required.' });
    }

    const report = await getFarmCalendarReport(calendarId);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Farm calendar not found.' });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error('getFarmCalendarReportController error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate farm calendar report.' });
  }
};