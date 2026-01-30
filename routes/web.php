<?php

use Illuminate\Support\Facades\Route;

// Serve the React app for all routes (SPA catch-all)
Route::get('/{any?}', fn () => view('app'))->where('any', '.*');
