(() => {
  const cards = document.querySelectorAll("[data-github-account]");
  if (!cards.length) return;

  const formatNumber = new Intl.NumberFormat("zh-CN");

  const parseDate = (dateText) => {
    const date = new Date(`${dateText}T00:00:00Z`);
    return Number.isNaN(date.valueOf()) ? null : date;
  };

  const levelFor = (day, max) => {
    if (Number.isInteger(day.level)) return Math.min(4, Math.max(0, day.level));
    if (!day.count) return 0;
    const ratio = max ? day.count / max : 0;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  };

  const render = (card, payload) => {
    const grid = card.querySelector("[data-github-activity-grid]");
    const totalEl = card.querySelector("[data-github-contribution-total]");
    const activeWeeksEl = card.querySelector("[data-github-active-weeks]");
    const note = card.querySelector("[data-github-activity-note]");
    const contributions = Array.isArray(payload.contributions) ? payload.contributions : [];
    if (!contributions.length) throw new Error("GitHub account activity is empty");

    const byDate = new Map(contributions.map((day) => [day.date, day]));
    const dates = contributions.map((day) => parseDate(day.date)).filter(Boolean);
    const latestDate = new Date(Math.max(...dates.map((date) => date.valueOf())));
    const latestWeekStart = new Date(latestDate);
    latestWeekStart.setUTCDate(latestWeekStart.getUTCDate() - latestWeekStart.getUTCDay());
    const firstWeekStart = new Date(latestWeekStart);
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() - 51 * 7);
    const days = contributions.map((day) => Number(day.count || 0));
    const max = Math.max(0, ...days);
    let total = 0;
    let activeWeeks = 0;
    grid.replaceChildren();

    for (let weekIndex = 0; weekIndex < 52; weekIndex += 1) {
      let weekTotal = 0;
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = new Date(firstWeekStart);
        date.setUTCDate(date.getUTCDate() + weekIndex * 7 + dayIndex);
        const dateText = date.toISOString().slice(0, 10);
        const day = byDate.get(dateText) || { count: 0, level: 0 };
        const count = Number(day.count || 0);
        weekTotal += count;
        total += count;

        const cell = document.createElement("span");
        cell.className = `github-activity-cell level-${levelFor(day, max)}`;
        cell.title = `${date.toLocaleDateString("zh-CN")}：${count} 次贡献`;
        cell.setAttribute("aria-label", cell.title);
        grid.appendChild(cell);
      }
      if (weekTotal > 0) activeWeeks += 1;
    }

    totalEl.textContent = `${formatNumber.format(total)} 次`;
    activeWeeksEl.textContent = `${activeWeeks} 个活跃周`;
    note.textContent = "统计范围：最近 52 周；数据来自 GitHub 账号贡献日历。";
  };

  fetch("/data/github-account-activity.json", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub account activity: ${response.status}`);
      return response.json();
    })
    .then((payload) => cards.forEach((card) => render(card, payload)))
    .catch(() => {
      cards.forEach((card) => {
        const note = card.querySelector("[data-github-activity-note]");
        const total = card.querySelector("[data-github-contribution-total]");
        const activeWeeks = card.querySelector("[data-github-active-weeks]");
        total.textContent = "暂无数据";
        activeWeeks.textContent = "等待下一次构建";
        note.textContent = "本次构建暂无 GitHub 账号活动快照，请稍后刷新。";
      });
    });
})();
