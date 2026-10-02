(() => {
  const cards = document.querySelectorAll("[data-github-repo]");
  if (!cards.length) return;

  const formatNumber = new Intl.NumberFormat("zh-CN");

  const levelFor = (count, max) => {
    if (!count) return 0;
    const ratio = max ? count / max : 0;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  };

  const render = (card, weeks) => {
    const grid = card.querySelector("[data-github-activity-grid]");
    const totalEl = card.querySelector("[data-github-commit-total]");
    const activeWeeksEl = card.querySelector("[data-github-active-weeks]");
    const note = card.querySelector("[data-github-activity-note]");
    const recentWeeks = Array.isArray(weeks) ? weeks.slice(-52) : [];
    const days = recentWeeks.flatMap((week) => week.days || []);
    const max = Math.max(0, ...days);
    const total = recentWeeks.reduce((sum, week) => sum + Number(week.total || 0), 0);
    const activeWeeks = recentWeeks.filter((week) => Number(week.total || 0) > 0).length;

    totalEl.textContent = `${formatNumber.format(total)} 次`;
    activeWeeksEl.textContent = `${activeWeeks} 个活跃周`;
    grid.replaceChildren();

    recentWeeks.forEach((week) => {
      (week.days || []).forEach((count, dayIndex) => {
        const cell = document.createElement("span");
        const date = week.week ? new Date((week.week + dayIndex * 86400) * 1000) : null;
        const dateText = date && !Number.isNaN(date.valueOf())
          ? date.toLocaleDateString("zh-CN")
          : "未知日期";
        cell.className = `github-activity-cell level-${levelFor(count, max)}`;
        cell.title = `${dateText}：${count} 次提交`;
        cell.setAttribute("aria-label", cell.title);
        grid.appendChild(cell);
      });
    });

    note.textContent = "统计范围：最近 52 周；数据来自 GitHub 公共 API。";
  };

  fetch("/data/github-commit-activity.json", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub activity: ${response.status}`);
      return response.json();
    })
    .then((weeks) => cards.forEach((card) => render(card, weeks)))
    .catch(() => {
      cards.forEach((card) => {
        const note = card.querySelector("[data-github-activity-note]");
        const total = card.querySelector("[data-github-commit-total]");
        const activeWeeks = card.querySelector("[data-github-active-weeks]");
        total.textContent = "暂无数据";
        activeWeeks.textContent = "等待下一次构建";
        note.textContent = "本地预览暂无 GitHub 活动快照，部署构建后会自动生成。";
      });
    });
})();
