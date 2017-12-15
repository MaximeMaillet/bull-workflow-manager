
## Créer un workflow

- Ajouter la configuration

```yaml
#Name random
name: "My Flow"
#Endpoint /hook/flow/created
id: flow-created

requirements:
  #Les data correspondent au corps de la requête HTTP
  data:
    - account_type: 4

#Déclaration des stage
stages:
  - my_flow_job_1: #name random
      #Name du job (/src/jobs)    
      job: flow/created/mon_job_1
      #Defaut 1
      priority: 1
      #Job sous cron
      repeat:
        cron: "*/5 * * * * *"
      #Data inclut avec le job
      data:
        - my_workflow_data: 23
      #Nouveau stage en cas de job success
      on_success:
        job: job_success
        # [...] reprend les mêmes options qu'un stage
      #Nouveau stage en cas de fail
      on_fail:
        job: job_fail
        # [...] reprend les mêmes options qu'un stage
```