import { Layout } from '../components/Layout'
import { mockPatientsList, mockDoctorsList } from '../mock/patient'

export function AdminPage() {
  return (
    <Layout role="admin" title="Панель администратора">
      <div className="mc-admin-stats">
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">{mockPatientsList.length}</div>
          <div className="mc-admin-stat__label">Пациентов</div>
        </div>
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">{mockDoctorsList.length}</div>
          <div className="mc-admin-stat__label">Врачей</div>
        </div>
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">12</div>
          <div className="mc-admin-stat__label">Болезней в справочнике</div>
        </div>
      </div>

      <div className="mc-admin-stack">
        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Пациенты</h2>
            <button type="button" className="mc-btn mc-btn--primary">
              + Добавить пациента
            </button>
          </div>
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Дата рождения</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {mockPatientsList.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fullName}</td>
                    <td>{p.birthDate}</td>
                    <td>
                      <div className="mc-actions">
                        <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                          Карта
                        </button>
                        <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Врачи</h2>
            <button type="button" className="mc-btn mc-btn--primary">
              + Добавить врача
            </button>
          </div>
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Специальность</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {mockDoctorsList.map((d) => (
                  <tr key={d.id}>
                    <td>{d.fullName}</td>
                    <td>{d.specialty}</td>
                    <td>
                      <div className="mc-actions">
                        <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                          Изменить
                        </button>
                        <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Справочник болезней</h2>
            <button type="button" className="mc-btn mc-btn--primary">
              + Болезнь
            </button>
          </div>
          <p className="mc-island__desc">
            Общий каталог болезней по МКБ.
          </p>
        </section>
      </div>
    </Layout>
  )
}
