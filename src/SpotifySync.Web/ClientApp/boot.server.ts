import 'reflect-metadata';
import 'zone.js';
import 'rxjs/add/operator/first';
import { APP_BASE_HREF } from '@angular/common';
import {
    enableProdMode,
    ApplicationRef,
    NgZone,
    ValueProvider,
} from '@angular/core';
import {
    platformDynamicServer,
    PlatformState,
    INITIAL_CONFIG,
} from '@angular/platform-server';
import { createServerRenderer, RenderResult } from 'aspnet-prerendering';
import { AppModule } from './app/app.server.module';
import {
    SPOTIFY_API_KEYS,
    SpotifyApiKeys,
} from './app/services/spotify-api.service';

enableProdMode();

export default createServerRenderer(params => {
    const data: SpotifyApiKeys = params.data || {};
    const providers = [
        {
            provide: INITIAL_CONFIG,
            useValue: { document: '<app></app>', url: params.url },
        },
        { provide: APP_BASE_HREF, useValue: params.baseUrl },
        { provide: 'BASE_URL', useValue: params.origin + params.baseUrl },
        { provide: SPOTIFY_API_KEYS, useValue: data },
    ];

    return platformDynamicServer(providers)
        .bootstrapModule(AppModule)
        .then(moduleRef => {
            const appRef: ApplicationRef = moduleRef.injector.get(
                ApplicationRef,
            );
            const state = moduleRef.injector.get(PlatformState);
            const zone = moduleRef.injector.get(NgZone);

            return new Promise<RenderResult>((resolve, reject) => {
                zone.onError.subscribe((errorInfo: any) => reject(errorInfo));
                appRef.isStable.first(isStable => isStable).subscribe(() => {
                    // Because 'onStable' fires before 'onError', we have to delay slightly before
                    // completing the request in case there's an error to report
                    setImmediate(() => {
                        resolve({
                            html: state.renderToString(),
                            globals: {
                                spotifyConfig: {
                                    clientId: data.clientId,
                                },
                            },
                        });
                        moduleRef.destroy();
                    });
                });
            });
        });
});
