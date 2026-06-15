export interface Question {
  id: number
  team1: { label: string; emoji: string; color: string }
  team2: { label: string; emoji: string; color: string }
  accentColor: string
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    team1: { label: 'Sommer', emoji: '☀️', color: '#FF6B35' },
    team2: { label: 'Vinter', emoji: '❄️', color: '#4FC3F7' },
    accentColor: '#FF6B35',
  },
  {
    id: 2,
    team1: { label: 'Katt', emoji: '🐱', color: '#AB47BC' },
    team2: { label: 'Hund', emoji: '🐶', color: '#FF8F00' },
    accentColor: '#AB47BC',
  },
  {
    id: 3,
    team1: { label: 'Pepsi', emoji: '🔵', color: '#1565C0' },
    team2: { label: 'Cola', emoji: '🔴', color: '#C62828' },
    accentColor: '#1565C0',
  },
  {
    id: 4,
    team1: { label: 'B-menneske', emoji: '🌙', color: '#5C6BC0' },
    team2: { label: 'A-menneske', emoji: '🌅', color: '#EF6C00' },
    accentColor: '#5C6BC0',
  },
  {
    id: 5,
    team1: { label: 'Norsk sommer', emoji: '🏔️', color: '#2E7D32' },
    team2: { label: 'Utenlands sommer', emoji: '✈️', color: '#00838F' },
    accentColor: '#2E7D32',
  },
]

export const INTERN_1_NAME = 'Intern 1'
export const INTERN_2_NAME = 'Intern 2'
