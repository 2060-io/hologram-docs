# Verifiable Service

A **Verifiable Service (VS)** is a service capable of identifying itself to a peer *before any connection is established*.

Peers wishing to connect to a VS can **review the Verifiable Credentials presented by the service**, verify their legitimacy through trust resolution, and **decide whether to proceed with the connection based on the outcome**.

A VS is also required to verify the trustworthiness of peers attempting to connect to it, whether those peers are other Verifiable Services (VS) or Verifiable User Agents (VUA), and must reject connections from non-verifiable peers.

Furthermore, if a Verifiable Service wants to issue credentials or request credential presentation, **it must first prove that it is authorized to perform these actions**. Otherwise, the peer must refuse the request.

Examples of Verifiable Services includes services built for [Hologram Messaging](https://hologram.zone).
