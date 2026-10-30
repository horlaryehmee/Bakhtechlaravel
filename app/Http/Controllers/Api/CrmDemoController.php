<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmDemoService;

class CrmDemoController extends Controller
{
    public function status(CrmDemoService $demo) { return response()->json(['contacts' => $demo->count()]); }
    public function seed(CrmDemoService $demo) { return response()->json(['contacts' => $demo->seed()]); }
    public function clear(CrmDemoService $demo) { return response()->json(['cleared' => $demo->clear()]); }
}
