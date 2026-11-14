<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeploymentMaintenanceService;
use App\Services\SiteRecoveryService;
use Illuminate\Http\Request;

class SystemMaintenanceController extends Controller
{
    public function status(SiteRecoveryService $recovery)
    {
        return $recovery->status();
    }

    public function operation(Request $request, SiteRecoveryService $recovery)
    {
        $data = $request->validate([
            'action' => 'required|in:update,backup,restore',
            'backup' => 'required_if:action,restore|nullable|string',
            'confirmation' => 'required_if:action,restore|nullable|in:RESTORE',
        ]);
        return response()->json($recovery->enqueue($data['action'], $data['backup'] ?? null), 202);
    }

    public function deploy(DeploymentMaintenanceService $maintenance)
    {
        return $maintenance->run();
    }

    public function deleteBackup(Request $request, SiteRecoveryService $recovery)
    {
        $data = $request->validate(['backup' => 'required|string', 'confirmation' => 'required|in:DELETE']);
        $recovery->deleteBackup($data['backup']);
        return response()->json(['message' => 'Backup permanently deleted.']);
    }
}
