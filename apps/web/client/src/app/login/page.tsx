import { Hero } from '../_components/hero';
import { WebsiteLayout } from '../_components/website-layout';

// /login and / render the same Forge sign-up gate. The old Onlook OAuth
// sign-up screen has been removed.
export default function LoginPage() {
    return (
        <WebsiteLayout>
            <div className="h-screen w-screen">
                <Hero />
            </div>
        </WebsiteLayout>
    );
}
