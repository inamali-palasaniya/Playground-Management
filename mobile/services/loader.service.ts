type Listener = (loading: boolean) => void;

class LoaderService {
    private listeners: Listener[] = [];
    private loadingCount = 0;

    show() {
        this.loadingCount++;
        if (this.loadingCount === 1) {
            this.notify(true);
        }
    }

    hide() {
        if (this.loadingCount > 0) {
            this.loadingCount--;
            if (this.loadingCount === 0) {
                this.notify(false);
            }
        }
    }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(loading: boolean) {
        this.listeners.forEach(l => l(loading));
    }
}

export const loaderService = new LoaderService();
