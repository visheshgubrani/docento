// #region quickstart
import { DocentoApi } from '@docento/sdk'

export async function listAcademyCourses(academyId: string) {
  const api = new DocentoApi({
    baseUrl: 'https://academy.example.com',
  })

  const { courses } = await api.listCatalogCourses(academyId)

  return courses
}
// #endregion quickstart
