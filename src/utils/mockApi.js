export function mockFetchFir(number) {
  const seedIndex = [...number].reduce((s, c) => s + c.charCodeAt(0), 0);
  const stations = ["MIDC Police Station", "Andheri Police Station", "Colaba Police Station", "Worli Police Station"];
  const sections = ["IPC 379", "IPC 420", "IPC 302", "IPC 354", "IT Act 66C"];
  return {
    number,
    station: stations[seedIndex % stations.length],
    date: new Date(Date.now() - (seedIndex % 30) * 86400000).toISOString().slice(0, 10),
    section: sections[seedIndex % sections.length],
    complainant: "Withheld — visible to assigned personnel only",
    summary:
      "Complainant reported the incident at the above station. Preliminary investigation has been assigned to the reporting officer.",
  };
}
