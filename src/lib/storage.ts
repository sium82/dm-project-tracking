import type { User, Project } from '@/types'

export const getUsers = (): User[] => {
  try { return JSON.parse(localStorage.getItem('pt_users') || '[]') } catch { return [] }
}
export const saveUsers = (u: User[]) => localStorage.setItem('pt_users', JSON.stringify(u))

export const getSession = (): User | null => {
  try { const d = localStorage.getItem('pt_session'); return d ? JSON.parse(d) : null } catch { return null }
}
export const setSession = (u: User | null) => {
  if (u) localStorage.setItem('pt_session', JSON.stringify(u))
  else localStorage.removeItem('pt_session')
}

export const getProjects = (uid: string): Project[] => {
  try { return JSON.parse(localStorage.getItem(`pt_p_${uid}`) || '[]') } catch { return [] }
}
export const saveProjects = (uid: string, p: Project[]) =>
  localStorage.setItem(`pt_p_${uid}`, JSON.stringify(p))
