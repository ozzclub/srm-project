data excel untuk kolom nya seperti berikut ini:

No, List Item, Deskripsi Item, Unit, Request_Qty, Request_Status, Receive_Qty, Remaining_Qty, Date_Req


untuk 'Request_Status' adalah status apakah barang sudah terpenuhi sepenuhnya atau belum

lalu saya ingin agar untuk SPP tools atau material yang sudah di request dan suda di penuhi, akan masuk ke page baru di 'Inventory'

dan di dalam Inventory ini akan ada tab untuk Tools sendiri dan juga material yang sekali pakai habis. 

- akan ada fungsi juga untuk approval dari SITE jika sudah menerima barang, jadi dari workshop atau user 'workshop' juga bisa update untuk data SPP tools atau pun material yang sudah dikirimkan ke SITE dan user 'material_site' bisa untuk approve apakah barang sudah di terima maka barulah akan di tambahkan ke inventory juga data nya



saya ingin untuk workflow nya adalah:

- yang membuat spp request adalah dari SITE dan workshop atau kantor menerima list requestnya untuk di lakukan pengadaan, dan lalu akan di kirimkan ke SITE,

- tetapi saat di lakukan pengiriman, workshop atau kantor juga bisa update untuk material yang sudah dikirimkan dan SITE akan melakukan update juga apakah barang yang sudah dikirimkan sudah di terima di SITE

- dan SITE juga dapat mengupdate langsung juga untuk barang yang sudah di terima tanpa perlu WORKSHOP atau KANTOR update barang nya

- dan saya ingin untuk fulfillment material yang di kirimkan bisa di lakukan per material karena pasti tidak sekaligus material yang di kirimkan langsung sekaligus semuanya, sehingga update di lakukan per satu item bisa juga. 