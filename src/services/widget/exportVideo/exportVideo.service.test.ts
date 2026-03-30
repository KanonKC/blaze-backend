import ExportVideoService from "./exportVideo.service";
import ExportVideoRepository from "@/repositories/exportVideo/exportVideo.repository";
import UserRepository from "@/repositories/user/user.repository";
import WidgetService from "../widget.service";
import { NotFoundError } from "@/errors";
import TwitchGql from "@/providers/twitchGql";

jest.mock("crypto", () => ({
    randomBytes: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue("mocked_hex"),
    }),
}));

describe("ExportVideoService", () => {
    let service: ExportVideoService;
    let mockExportVideoRepo: jest.Mocked<ExportVideoRepository>;
    let mockUserRepo: jest.Mocked<UserRepository>;
    let mockWidgetService: jest.Mocked<WidgetService>;
    let mockTwitchGql: jest.Mocked<TwitchGql>;

    beforeEach(() => {
        mockExportVideoRepo = {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            get: jest.fn(),
            getByOwnerId: jest.fn(),
            createHistory: jest.fn(),
            listHistoryByExportVideoId: jest.fn(),
            getHistory: jest.fn(),
            deleteHistory: jest.fn(),
        } as any;
        mockUserRepo = {
            get: jest.fn(),
        } as any;
        mockWidgetService = {
            setInitialEnabled: jest.fn(),
            authorizeOwnership: jest.fn(),
        } as any;
        mockTwitchGql = {
            exportVideosToYoutube: jest.fn(),
        } as any;

        service = new ExportVideoService(
            mockExportVideoRepo,
            mockUserRepo,
            mockWidgetService,
            mockTwitchGql
        );
        jest.clearAllMocks();
    });

    describe("create", () => {
        const request = { 
            owner_id: "user_1", 
            twitch_id: "twitch_1", 
            overlay_key: "key_1",
            privacy_status: "UNLISTED",
            tags: ["test"],
            description: "test description"
        };

        it("should create export video successfully", async () => {
            mockUserRepo.get.mockResolvedValue({ id: "user_1" } as any);
            mockExportVideoRepo.create.mockResolvedValue({ id: "ev_1", widget_id: "widget_1" } as any);

            const result = await service.create(request);

            expect(mockUserRepo.get).toHaveBeenCalledWith(request.owner_id);
            expect(mockExportVideoRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                privacy_status: "UNLISTED",
                tags: ["test"],
                description: "test description"
            }));
            expect(mockWidgetService.setInitialEnabled).toHaveBeenCalledWith("widget_1", "user_1");
            expect(result).toBeDefined();
        });

        it("should throw NotFoundError if user not found", async () => {
            mockUserRepo.get.mockResolvedValue(null);
            await expect(service.create(request)).rejects.toThrow(NotFoundError);
        });
    });

    describe("getByUserId", () => {
        it("should return config successfully", async () => {
            const mockRes = { id: "ev_1", widget: { id: "widget_1" } };
            mockExportVideoRepo.getByOwnerId.mockResolvedValue(mockRes as any);

            const result = await service.getByUserId("user_1");

            expect(result).toEqual(mockRes);
            expect(mockWidgetService.authorizeOwnership).toHaveBeenCalledWith("user_1", "widget_1");
        });

        it("should throw NotFoundError if config missing", async () => {
            mockExportVideoRepo.getByOwnerId.mockResolvedValue(null);
            await expect(service.getByUserId("user_1")).rejects.toThrow(NotFoundError);
        });
    });

    describe("update", () => {
        it("should update config successfully", async () => {
            const mockExisting = { id: "ev_1", widget: { id: "widget_1" } };
            mockExportVideoRepo.get.mockResolvedValue(mockExisting as any);
            mockExportVideoRepo.update.mockResolvedValue({ id: "ev_1" } as any);

            await service.update("ev_1", "user_1", { 
                enabled: false,
                privacy_status: "PUBLIC",
                tags: ["new"],
                description: "new description"
            });

            expect(mockExportVideoRepo.update).toHaveBeenCalledWith("ev_1", expect.objectContaining({
                enabled: false,
                privacy_status: "PUBLIC",
                tags: ["new"],
                description: "new description"
            }));
            expect(mockWidgetService.authorizeOwnership).toHaveBeenCalledWith("user_1", "widget_1");
        });
    });

    describe("delete", () => {
        it("should delete config successfully", async () => {
            const mockExisting = { id: "ev_1", widget: { id: "widget_1" } };
            mockExportVideoRepo.getByOwnerId.mockResolvedValue(mockExisting as any);

            await service.delete("user_1");

            expect(mockExportVideoRepo.delete).toHaveBeenCalledWith("ev_1");
        });
    });

    describe("History methods", () => {
        const mockExisting = { id: "ev_1", widget: { id: "widget_1" } };

        beforeEach(() => {
            mockExportVideoRepo.get.mockResolvedValue(mockExisting as any);
        });

        it("should create history successfully", async () => {
            mockExportVideoRepo.createHistory.mockResolvedValue({ id: 1 } as any);
            const request = { batch_id: "b1", video_id: "v1", status: "PENDING" };

            await service.createHistory("user_1", "ev_1", request);

            expect(mockExportVideoRepo.createHistory).toHaveBeenCalledWith({
                ...request,
                export_video_id: "ev_1"
            });
        });

        it("should list history successfully", async () => {
            mockExportVideoRepo.listHistoryByExportVideoId.mockResolvedValue([{ id: 1 }] as any);

            const result = await service.listHistory("user_1", "ev_1");

            expect(result).toHaveLength(1);
            expect(mockExportVideoRepo.listHistoryByExportVideoId).toHaveBeenCalledWith("ev_1");
        });

        it("should get history successfully", async () => {
            mockExportVideoRepo.getHistory.mockResolvedValue({ id: 1, export_video_id: "ev_1" } as any);

            const result = await service.getHistory("user_1", 1);

            expect(result).toBeDefined();
            expect(mockWidgetService.authorizeOwnership).toHaveBeenCalledWith("user_1", "widget_1");
        });

        it("should delete history successfully", async () => {
            mockExportVideoRepo.getHistory.mockResolvedValue({ id: 1, export_video_id: "ev_1" } as any);

            await service.deleteHistory("user_1", 1);

            expect(mockExportVideoRepo.deleteHistory).toHaveBeenCalledWith(1);
        });
    });
});
