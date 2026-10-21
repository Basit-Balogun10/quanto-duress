import type { Recipient, Transaction } from './types'

export const recipients: Recipient[] = [
  {
    id: 'chidi',
    name: 'Chidi Okafor',
    bank: 'Opay',
    accountNumber: '8123456789',
    initials: 'CO',
  },
  {
    id: 'mama',
    name: 'Mama Ngozi',
    bank: 'GTBank',
    accountNumber: '0123456789',
    initials: 'MN',
    trusted: true,
  },
  {
    id: 'tunde',
    name: 'Tunde Bello',
    bank: 'Access Bank',
    accountNumber: '0987654321',
    initials: 'TB',
    trusted: true,
  },
  {
    id: 'zara',
    name: 'Zara Ahmed',
    bank: 'Kuda',
    accountNumber: '2233445566',
    initials: 'ZA',
  },
]

function daysAgo(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString()
}

export const seedTransactions: Transaction[] = [
  {
    id: 'tx_mama_seed',
    direction: 'out',
    recipientId: 'mama',
    recipientName: 'Mama Ngozi',
    recipientBank: 'GTBank',
    amount: 25000,
    note: 'Weekly support',
    createdAt: daysAgo(2, 4),
    status: 'completed',
  },
  {
    id: 'tx_tunde_seed',
    direction: 'out',
    recipientId: 'tunde',
    recipientName: 'Tunde Bello',
    recipientBank: 'Access Bank',
    amount: 40000,
    note: 'Rent contribution',
    createdAt: daysAgo(5, 2),
    status: 'completed',
  },
  {
    id: 'tx_data_seed',
    direction: 'out',
    recipientName: 'MTN Data',
    recipientBank: 'MTN',
    amount: 8500,
    note: '10GB data plan',
    createdAt: daysAgo(6, 1),
    status: 'completed',
  },
  {
    id: 'tx_salary_seed',
    direction: 'in',
    recipientName: 'Salary',
    recipientBank: 'Quanto',
    amount: 650000,
    note: 'October salary',
    createdAt: daysAgo(11),
    status: 'completed',
  },
]
