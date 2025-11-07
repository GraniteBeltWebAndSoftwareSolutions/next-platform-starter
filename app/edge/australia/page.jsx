import EdgeFunctionExplainer from '../explainer';

export const metadata = {
    title: 'In Australia'
};

export default function Page() {
    return (
        <>
            <h1 className="mb-8">Hi Jason, you are in Australia!</h1>
            <EdgeFunctionExplainer />
        </>
    );
}
