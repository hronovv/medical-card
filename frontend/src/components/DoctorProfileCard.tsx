import type { SessionUser } from '../types/auth'

type DoctorProfileCardProps = {
  doctor: Pick<SessionUser, 'fullName' | 'email' | 'phone' | 'specialty'>
}

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return fullName.slice(0, 2).toUpperCase()
}

export function DoctorProfileCard({ doctor }: DoctorProfileCardProps) {
  const initials = initialsFromName(doctor.fullName)

  return (
    <section className="mc-doctor-cabinet" aria-label="Профиль врача">
      <div className="mc-doctor-cabinet__glow" aria-hidden />
      <div className="mc-doctor-cabinet__inner">
        <div className="mc-doctor-cabinet__top">
          <div className="mc-doctor-cabinet__avatar" aria-hidden>
            {initials}
          </div>

          <div className="mc-doctor-cabinet__main">
            <p className="mc-doctor-cabinet__label">Личный кабинет</p>
            <h2 className="mc-doctor-cabinet__name">{doctor.fullName}</h2>
            {doctor.specialty && (
              <span className="mc-doctor-cabinet__specialty">{doctor.specialty}</span>
            )}
          </div>
        </div>

        <div className="mc-doctor-cabinet__contacts">
          {doctor.phone && (
            <a
              className="mc-doctor-cabinet__contact mc-doctor-cabinet__contact--phone"
              href={`tel:${doctor.phone.replace(/\s/g, '')}`}
            >
              {doctor.phone}
            </a>
          )}
          <a
            className="mc-doctor-cabinet__contact mc-doctor-cabinet__contact--email"
            href={`mailto:${doctor.email}`}
          >
            {doctor.email}
          </a>
        </div>
      </div>
    </section>
  )
}
