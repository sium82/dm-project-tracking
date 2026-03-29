export interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
}

export type ProjectStatus = 'wip' | 'complete' | 'cancel'

export interface Project {
  id: string
  orderId: string
  clientName: string
  profileName: string
  docLink: string
  status: ProjectStatus
  assignDate: string
  deadlineDate: string
  grossValue: number
  category: string
  stars: number
  notes: string
  cancelRemarks: string
  createdAt: string
}

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}
