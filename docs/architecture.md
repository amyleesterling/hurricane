# Architecture

The application is a static React/Vite site. Zustand owns serializable UI state and URL restoration. `StormGlobe` is a narrow imperative adapter: Cesium primitives, picking, camera flight, and resource disposal remain outside React's render loop. The manifest loads before individual compact JSON tracks. A future worker-backed index can replace the in-memory demo index without changing the public schema.

At full scale, manifests are partitioned by decade and basin, temporal indexes are generated offline, tracks are quantized and chunked, and imagery is served as multi-resolution sprite sheets or texture atlases. The renderer can advance from batched Cesium collections to GPU-instanced quads while preserving the adapter boundary.
