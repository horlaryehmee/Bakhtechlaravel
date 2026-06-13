<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeploymentMaintenanceService;

class SystemMaintenanceController extends Controller
{
    public function deploy(DeploymentMaintenanceService $maintenance)
    {
        return $maintenance->run();
    }
}
