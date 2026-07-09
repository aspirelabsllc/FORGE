import { Button } from '@onlook/ui/button';
import { useCustomDomainContext } from './provider';

export const NoCustomDomain = () => {
    const { openCustomDomain } = useCustomDomainContext();

    return (
        <>
            <div className="flex items-center w-full">
                <h3 className="">Custom Domain</h3>
            </div>

            <Button
                onClick={openCustomDomain}
                className="w-full rounded-md p-3 bg-blue-600 border-blue border hover:bg-blue-700 text-white"
            >
                Link a Custom Domain
            </Button>
        </>
    );
};
