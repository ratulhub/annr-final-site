// Data-access boundary for the admin panel. Today it is browser localStorage (demo only).
// To connect a real backend later, replace this object with API/database calls; pages don't change.
export interface DataSource {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
  clear(key: string): void;
}

export const localDataSource: DataSource = {
  read(key) {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  clear(key) { localStorage.removeItem(key); },
};

export const dataSource: DataSource = localDataSource;
