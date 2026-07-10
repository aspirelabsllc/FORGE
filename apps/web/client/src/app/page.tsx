import { Hero } from './_components/hero';
import { WebsiteLayout } from './_components/website-layout';

export default function Main() {
    return (
        <WebsiteLayout>
            <div className="h-screen w-screen" id="hero">
                <Hero />
            </div>
        </WebsiteLayout>
    );
}
