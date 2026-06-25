import { AppService } from './app.service';
import { AdminService } from './admin/admin.service';
export declare class AppController {
    private readonly appService;
    private readonly adminService;
    constructor(appService: AppService, adminService: AdminService);
    getHello(): string;
    initAdmin(body: {
        email: string;
        password: string;
    }): Promise<{
        success: boolean;
        message: string;
        userId: string;
    }>;
}
