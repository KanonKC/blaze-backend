import WidgetRepository from "@/repositories/widget/widget.repository";
import { UpdateWidget } from "@/repositories/widget/request";

export default class WidgetService {
    private widgetRepository: WidgetRepository;
    constructor(
        widgetRepository: WidgetRepository
    ) {
        this.widgetRepository = widgetRepository;
    }

    async update(id: string, request: UpdateWidget) {
        return this.widgetRepository.update(id, request);
    }

    async delete(id: string) {
        return this.widgetRepository.delete(id);
    }
}