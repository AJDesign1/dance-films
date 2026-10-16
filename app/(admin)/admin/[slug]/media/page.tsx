import { notFound } from 'next/navigation';
import { getManagedSchool } from '@/lib/admin';
import AdminHeader from '@/components/admin/AdminHeader';
import MediaLibrary from '@/components/admin/MediaLibrary';
import styles from '../admin.module.css';

export default async function MediaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getManagedSchool(slug);
  if (!school) notFound();
  return <><AdminHeader title="Media library" /><div className={styles.content}>
    <MediaLibrary schoolId={school.id} />
  </div></>;
}
