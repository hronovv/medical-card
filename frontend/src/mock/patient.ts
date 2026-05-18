export const mockPatient = {
  id: '1',
  fullName: 'Иванов Иван Иванович',
  birthDate: '12.03.1990',
  phone: '+7 (999) 123-45-67',
}

export const mockDiseases = [
  { id: '1', name: 'Гипертония', code: 'I10', diagnosedAt: '15.01.2024' },
  { id: '2', name: 'Сахарный диабет 2 типа', code: 'E11', diagnosedAt: '03.06.2023' },
]

export const mockAnalyses = [
  { id: '1', type: 'Общий анализ крови', result: 'В пределах нормы', date: '10.05.2026' },
  { id: '2', type: 'Глюкоза', result: '5.8 ммоль/л', date: '02.04.2026' },
]

export const mockVisits = [
  {
    id: '1',
    date: '10.05.2026',
    doctor: 'Петрова А.С.',
    notes: 'Контроль давления, назначена коррекция терапии.',
  },
  {
    id: '2',
    date: '12.02.2026',
    doctor: 'Сидоров П.И.',
    notes: 'Плановый осмотр, жалоб нет.',
  },
]

export const mockPrescriptions = [
  { id: '1', drug: 'Эналаприл', dosage: '10 мг', duration: '30 дней', visitDate: '10.05.2026' },
]

export const mockPatientsList = [
  { id: '1', fullName: 'Иванов Иван Иванович', birthDate: '12.03.1990' },
  { id: '2', fullName: 'Смирнова Анна Сергеевна', birthDate: '22.07.1985' },
  { id: '3', fullName: 'Козлов Дмитрий Петрович', birthDate: '05.11.1978' },
]

export const mockDoctorsList = [
  { id: '1', fullName: 'Петрова Анна Сергеевна', specialty: 'Терапевт' },
  { id: '2', fullName: 'Сидоров Пётр Иванович', specialty: 'Кардиолог' },
]
