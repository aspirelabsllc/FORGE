import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Hero } from './_components/hero';
import { WebsiteLayout } from './_components/website-layout';

export default async function Main() {
    // Authenticated users go to the app; the sign-up gate is for logged-out visitors.
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (session) {
        redirect(Routes.PROJECTS);
    }

    return (
        <WebsiteLayout>
            <div className="h-screen w-screen" id="hero">
                <Hero />
            </div>
        </WebsiteLayout>
    );
}
