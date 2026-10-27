/**
 * chartHelpers.js
 * Helper functions to transform raw task data from the backend
 * into datasets compatible with Chart.js for productivity dashboards.
 *
 * Member 3 - Data Visualization (D3.js / Chart.js)
 * These helpers are intended for use in the React/Angular frontend.
 */

/**
 * getTaskStatusDistribution
 * Builds a Pie/Doughnut chart dataset showing how many tasks
 * are in each status column (Pending, Ongoing, Completed).
 *
 * @param {Array} tasks - Array of task objects with a `status` field
 * @returns {object} Chart.js data config
 */
export const getTaskStatusDistribution = (tasks) => {
  const counts = { pending: 0, ongoing: 0, completed: 0 };
  tasks.forEach(({ status }) => {
    if (counts[status] !== undefined) counts[status]++;
  });

  return {
    labels: ['Pending', 'Ongoing', 'Completed'],
    datasets: [
      {
        label: 'Task Status Distribution',
        data: [counts.pending, counts.ongoing, counts.completed],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
        borderColor: ['#d97706', '#2563eb', '#059669'],
        borderWidth: 2,
      },
    ],
  };
};

/**
 * getTasksCompletedOverTime
 * Builds a Line chart dataset showing completed tasks per day
 * over the last N days (productivity trend).
 *
 * @param {Array} tasks - Array of task objects with `status` and `updatedAt`
 * @param {number} days - Number of past days to include (default: 7)
 * @returns {object} Chart.js data config
 */
export const getTasksCompletedOverTime = (tasks, days = 7) => {
  const today = new Date();
  const labels = [];
  const completedCounts = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(dateStr);

    const count = tasks.filter((task) => {
      if (task.status !== 'completed') return false;
      const updatedDate = new Date(task.updatedAt);
      return updatedDate.toDateString() === date.toDateString();
    }).length;

    completedCounts.push(count);
  }

  return {
    labels,
    datasets: [
      {
        label: 'Tasks Completed',
        data: completedCounts,
        fill: true,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointRadius: 5,
      },
    ],
  };
};

/**
 * getMemberProductivity
 * Builds a Bar chart dataset showing how many tasks each member
 * has completed — useful for team performance overviews.
 *
 * @param {Array} tasks - Array of task objects with `assignedTo.name` and `status`
 * @returns {object} Chart.js data config
 */
export const getMemberProductivity = (tasks) => {
  const memberCounts = {};

  tasks
    .filter((t) => t.status === 'completed' && t.assignedTo?.name)
    .forEach(({ assignedTo }) => {
      const name = assignedTo.name;
      memberCounts[name] = (memberCounts[name] || 0) + 1;
    });

  const members = Object.keys(memberCounts);
  const colors = members.map((_, i) => `hsl(${(i * 60) % 360}, 70%, 55%)`);

  return {
    labels: members,
    datasets: [
      {
        label: 'Completed Tasks',
        data: members.map((m) => memberCounts[m]),
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };
};

/**
 * getTimerStats
 * Builds a chart-ready summary of average time spent per task status.
 *
 * @param {Array} tasks - Array of task objects with `timerSeconds` and `status`
 * @returns {object} Chart.js data config (Bar chart)
 */
export const getTimerStats = (tasks) => {
  const groups = { pending: [], ongoing: [], completed: [] };

  tasks.forEach(({ status, timerSeconds }) => {
    if (groups[status] && timerSeconds != null) {
      groups[status].push(timerSeconds);
    }
  });

  const avg = (arr) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length / 60); // in minutes

  return {
    labels: ['Pending', 'Ongoing', 'Completed'],
    datasets: [
      {
        label: 'Avg Time Spent (minutes)',
        data: [avg(groups.pending), avg(groups.ongoing), avg(groups.completed)],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
        borderRadius: 6,
      },
    ],
  };
};
