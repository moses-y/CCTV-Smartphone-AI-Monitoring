let mediaPage = 1;
let mediaGeneration = 0;
let mediaLoading = false;

const mediaStartDate = document.getElementById("mediaStartDate");
const mediaEndDate = document.getElementById("mediaEndDate");

function localDateBoundary(value, nextDay = false) {
  const date = new Date(value + "T00:00:00");
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.getTime() / 1000;
}

async function refreshMedia(reset = false) {
  if (!accessState.admin) return;
  if (reset) mediaPage = 1;
  const generation = ++mediaGeneration;
  const kind = document.getElementById("mediaKind").value;
  const message = document.getElementById("mediaMessage");
  const rows = document.getElementById("mediaRows");
  const previous = document.getElementById("mediaPrevious");
  const next = document.getElementById("mediaNext");
  mediaLoading = true;
  previous.disabled = next.disabled = true;
  rows.replaceChildren();
  document.getElementById("mediaPage").textContent = "Page " + mediaPage;
  message.textContent = "Loading…";
  try {
    const start = mediaStartDate.value ? localDateBoundary(mediaStartDate.value) : null;
    const end = mediaEndDate.value ? localDateBoundary(mediaEndDate.value, true) : null;
    if (!mediaStartDate.validity.valid || !mediaEndDate.validity.valid ||
        Number.isNaN(start) || Number.isNaN(end)) {
      throw new Error("Enter a valid start or end date.");
    }
    if (start !== null && end !== null && start >= end) {
      throw new Error("Start date must be on or before end date.");
    }
    const query = new URLSearchParams({kind, page: String(mediaPage)});
    if (start !== null) query.set("modified_from", String(start));
    if (end !== null) query.set("modified_before", String(end));
    const r = await fetchJson(`/api/media?${query}`, {cache: "no-store"});
    if (generation !== mediaGeneration || !accessState.admin) return;
    if (r.status !== 200) throw new Error(r.json?.error || "Cannot list files");
    for (const item of r.json.items) {
      const row = document.createElement("tr");
      for (const text of [item.path, new Date(item.modified_at * 1000).toLocaleString(),
                          (item.size_bytes / 1024 / 1024).toFixed(2) + " MiB"]) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.append(cell);
      }
      const cell = document.createElement("td");
      const link = document.createElement("a");
      link.textContent = "Download";
      link.href = `/api/media/download?kind=${encodeURIComponent(kind)}&path=${encodeURIComponent(item.path)}`;
      link.setAttribute("download", item.name);
      cell.append(link);
      row.append(cell);
      rows.append(row);
    }
    const emptyMessage = start !== null || end !== null ? "No completed files match the date filter." : "No completed files on this page.";
    message.textContent = r.json.items.length ? "If cleanup removed a file, refresh the list before downloading." : emptyMessage;
    previous.disabled = mediaPage <= 1;
    next.disabled = !r.json.has_more || mediaPage >= 400;
  } catch (error) {
    if (generation === mediaGeneration && accessState.admin) message.textContent = error.message || "Cannot reach server";
  } finally {
    if (generation === mediaGeneration) mediaLoading = false;
  }
}

document.getElementById("mediaPanel").addEventListener("toggle", event => {
  if (event.target.open) refreshMedia(true);
});
document.getElementById("mediaKind").addEventListener("change", () => refreshMedia(true));
for (const input of [mediaStartDate, mediaEndDate]) {
  input.addEventListener("change", () => refreshMedia(true));
}
document.getElementById("mediaClearDates").addEventListener("click", () => {
  mediaStartDate.value = mediaEndDate.value = "";
  refreshMedia(true);
});
document.getElementById("mediaRefresh").addEventListener("click", () => refreshMedia());
document.getElementById("mediaPrevious").addEventListener("click", () => {
  if (mediaLoading || mediaPage <= 1) return;
  mediaPage--;
  refreshMedia();
});
document.getElementById("mediaNext").addEventListener("click", () => {
  if (mediaLoading || mediaPage >= 400) return;
  mediaPage++;
  refreshMedia();
});
