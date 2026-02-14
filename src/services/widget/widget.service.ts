import WidgetRepository from "@/repositories/widget/widget.repository";
import { UpdateWidget } from "@/repositories/widget/request";

export default class WidgetService {
    private widgetRepository: WidgetRepository;
    constructor(
        widgetRepository: WidgetRepository
    ) {
        this.widgetRepository = widgetRepository;
    }

    async updateEnabled(id: string, enabled: boolean) {
        return this.widgetRepository.update(id, { enabled });
    }

    async updateOverlay(id: string, overlay: string) {
        return this.widgetRepository.update(id, { overlay });
    }

    async delete(id: string) {
        return this.widgetRepository.delete(id);
    }
}