import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Hero } from '../_components/hero';
import { WebsiteLayout } from '../_components/website-layout';

// /login and / render the same Forge sign-up gate. Authenticated users are sent
// into the app; the old Onlook OAuth sign-up screen has been removed.
export default async function LoginPage() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (session) {
        redirect(Routes.PROJECTS);
    }

    return (
        <WebsiteLayout>
            <div className="h-screen w-screen">
                <Hero />
            </div>
        </WebsiteLayout>
    );
}
